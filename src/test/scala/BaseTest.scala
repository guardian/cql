package cql

import org.scalatest._

import flatspec._
import matchers._
import funspec.AnyFunSpec
import org.scalatest.funspec.AsyncFunSpec

abstract class BaseTest extends AsyncFunSpec with should.Matchers
